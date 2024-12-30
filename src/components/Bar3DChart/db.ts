//import fetch from "node-fetch";
import { Bar3DChartPropData } from "./Bar3DChart";
const graphqlEndpoint =
  "https://zion-app.functorz.com/zero/AxQnl8eVN5z/api/graphql-v2";

export interface Data {
  [key: string]: any;
}
async function postDataWithHeaders(
  url: string,
  data: Data,
  headers: { [key: string]: string }
): Promise<Data> {
  try {
    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.log(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as Data;
  } catch (e) {
    console.log(
      "There was a problem with your fetch operation: " + (e as any).message
    );
    return {};
  }
}
async function sendGraphqlRequest(
  body: Data,
): Promise<Data> {
  const graphqlResponse = await postDataWithHeaders(
    graphqlEndpoint!,
    body,
    {}
  );
  return graphqlResponse;
}
export async function getData(propData:Bar3DChartPropData) {
  const gql = {
    query: `query city($year: String, $city: String) {
  city_sales(where: { city_name: { _eq: $city }, year: { _eq: $year } }) {
    city_name
    year
    sales
  }
}`,
    variables: {year:propData.year,city:propData.cityName },
  };
  const response = await sendGraphqlRequest(gql);
  if ((response as any).data) {
    return response;
  }
  throw (response as any).errors[0].message;
}
