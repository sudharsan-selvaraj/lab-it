import EventEmitter from "events";
import liburl from "url";
import http, { ClientRequest } from "http";
import https from "https";
import _ from "lodash";
const spawn = require("child_process").spawn;

const isBufferEqual = require("arraybuffer-equal");

const BOUNDARY_PATTERN = /multipart\/x-mixed-replace;\s*boundary=(.*)/;

const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);
const EOF = -1;
const MAX_BUFFER_SIZE = 16 * 4096 * 4096;
const DEFAULT_INTERVAL = 0;
const DEFAULT_MAX_FRAMES = 0;
const DEFAULT_TIMEOUT = 10000;

const DEFAULT_OPTIONS = {
  interval: DEFAULT_INTERVAL,
  maxFrames: DEFAULT_MAX_FRAMES,
  timeout: DEFAULT_TIMEOUT,
};

interface optionsType {
  interval: number;
  maxFrames: number;
  timeout: number;
}

export class FfmjpegMjpegDecoder extends EventEmitter {
  private url: string;
  private frame: Buffer | null;
  private data: Buffer;
  private imageStart: number;
  private imageEnd: number;
  private seq: number;
  private options: optionsType;
  private lastFrameTime: any;
  private callbackQueue: any[];
  private mjpegRequest!: ClientRequest;
  private lastFrameBuffer!: Uint8Array;

  constructor(mjpegUrl: string, options?: optionsType) {
    super();
    console.log("Ffmjepg");
    this.url = mjpegUrl;
    this.frame = null;
    this.data = Buffer.alloc(0);
    this.imageStart = -1;
    this.imageEnd = -1;
    this.seq = 0;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options || {}) as any;
    this.lastFrameTime = null;
    this.callbackQueue = [];
  }

  start() {
    var ffmpeg = "/usr/local/bin/ffmpeg";
    const p = spawn(
      ffmpeg,
      [
        "-f",
        "mjpeg",
        "-reconnect",
        "1",
        "-reconnect_at_eof",
        "1",
        "-reconnect_streamed",
        "1",
        "-i",
        // "http://localhost:8000",
        this.url,
        "-q:v",
        "31",
        "-r",
        "10",
        "-f",
        "mjpeg",
        "-",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    p.stdout.on("data", (data: Buffer) => {
      this.onDataReceived(data);
    });
  }

  stop() {
    if (!this.mjpegRequest) return;
    this.abort("end");
  }

  takeSnapshot() {
    return new Promise((resolve, reject) => {
      this.callbackQueue.push((err: any, frame: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(frame);
        }
      });
      if (!this.mjpegRequest) {
        this.start();
      }
    });
  }

  onDataReceived(chunk: any) {
    // for (let i = 0; i < chunk.length; i += 20 * 1024) {
    this.emit("frame", chunk);
    // }
    this.data = Buffer.concat([this.data, chunk]);
    if (this.data.length >= MAX_BUFFER_SIZE) {
      this.drainCallbackQueue(new Error("max buffer size exceeded, which might be caused by an internal codec error"));
      this.abort("max_buffer_size_exceeded");
      return;
    }
    if (this.imageStart === EOF) {
      this.imageStart = this.data.indexOf(SOI);
    }

    if (this.imageStart >= 0) {
      if (this.imageEnd === EOF) {
        this.imageEnd = this.data.indexOf(EOI, this.imageStart + SOI.length);
      }
      if (this.imageEnd >= this.imageStart) {
        // a frame is found.
        const frame = this.data.slice(this.imageStart, this.imageEnd + EOI.length);
        try {
          this.onFrameReady(frame);
        } catch (e) {}
        this.data = this.data.slice(this.imageEnd + EOI.length);
        this.imageStart = EOF;
        this.imageEnd = EOF;
      }
    }
  }

  drainCallbackQueue(err: any, frame?: Buffer) {
    while (this.callbackQueue.length) {
      const callback = this.callbackQueue.shift();
      try {
        callback(err, frame);
      } catch (e) {}
    }
  }

  async onFrameReady(frame: Buffer) {
    const { interval, maxFrames } = this.options;
    if (this.lastFrameTime && Date.now() - this.lastFrameTime < interval) {
      this.drainCallbackQueue(null, frame);
      return;
    }

    this.lastFrameTime = Date.now();
    this.frame = frame;
    this.seq++;

    if (_.isNil(this.lastFrameBuffer) || this.isScreenUpdated(frame)) {
      for (let i = 0; i < frame.length; i += 20 * 1024) {}
    }

    this.lastFrameBuffer = new Uint8Array(frame);
    this.drainCallbackQueue(null, frame);

    if (maxFrames > 0 && this.seq >= maxFrames) {
      this.abort("end");
      return;
    }
  }

  abort(reason: string, error?: any) {
    if (!this.mjpegRequest || this.mjpegRequest.aborted) return;
    try {
      this.mjpegRequest.abort();
    } catch (e) {}
    console.log(reason, error);
    this.emit("abort", reason, error);
  }

  isValidMjpegStream(contentType: string) {
    const match = BOUNDARY_PATTERN.exec(contentType);
    return Boolean(match);
  }

  isScreenUpdated(frame: Buffer) {
    return !isBufferEqual(this.lastFrameBuffer.buffer, new Uint8Array(frame).buffer);
  }
}
