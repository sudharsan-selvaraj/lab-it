import countryFromTimeZone from "countries-and-timezones";

export function getCountryDetailsFromTimeZone(timeZone: string): { countryCode: string; countryName: string } | {} {
  if (!timeZone) {
    return {};
  }

  const result = countryFromTimeZone.getCountryForTimezone(timeZone);
  if (result) {
    console.log(result);
    return {
      countryCode: result.id,
      countryName: result.name,
    };
  }
  return {};
}
