import { getData } from "./db";
type SalesData = {
  city_name: string;
  id: number;
  sales: number;
  year: string;
};
import { Bar3DChartPropData } from "./index";

export async function fetchAndProcessData(propData: Bar3DChartPropData) {
  const originalData: SalesData[] = (await getData(propData)).data.city_sales;

  // Extract the array of city names
  const cities = Array.from(
    new Set(originalData.map((data) => data.city_name))
  );

  // Extract the array of years
  const years = Array.from(new Set(originalData.map((data) => data.year)));

  // Extract data array
  const data = originalData.map((item) => [
    years.indexOf(item.year),
    cities.indexOf(item.city_name),
    item.sales,
  ]);

  return {
    cities,
    years,
    data,
  };
}
