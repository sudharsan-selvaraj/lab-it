export const SERVER_PACKAGE = "com.genymobile.scrcpy.Server";
export const SERVER_PORT = 8889;
export const SERVER_VERSION = "1.19-ws2";
export const SERVER_TYPE = "web";
export const LOG_LEVEL = "info";
export const SCRCPY_LISTENS_ON_ALL_INTERFACES = false;
export const SERVER_PROCESS_NAME = "app_process";
export const ARGUMENTS = [SERVER_VERSION, SERVER_TYPE, LOG_LEVEL, SERVER_PORT, SCRCPY_LISTENS_ON_ALL_INTERFACES];
// export const ARGUMENTS = [
//   SERVER_VERSION, // Scrcpy server version
//   "lock_video_orientation=-1", //  # Lock screen orientation: LOCK_SCREEN_ORIENTATION
//   "tunnel_forward=true", // # Tunnel forward
//   "control=true", //# Control enabled
//   "display_id=0", //# Display id
//   "show_touches=false", //# Show touches
//   "stay_awake=false", //if self.stay_awake else "false",  # Stay awake
//   "send_dummy_byte=false", //# Codec (video encoding) options
//   "power_off_on_close=false", // # Power off screen after server closed
// ];

export const ARGS_STRING = `/ ${SERVER_PACKAGE} ${ARGUMENTS.join(" ")} 2>&1 > /dev/null`;
