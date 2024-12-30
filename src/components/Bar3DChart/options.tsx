import { fetchAndProcessData } from "./processData";
import { Bar3DChartPropData } from "./index";
export async function fetchDemoOptionData(propData:Bar3DChartPropData) {
  const { cities, years, data } = await fetchAndProcessData(propData);
  const { min, max } = findMinMax(data);
  return {
    tooltip: {
      trigger: "item",
      formatter: function (params: any) {
        return `${cities[params.data.value[0]]}在${
          years[params.data.value[1]]
        }年的销售额是${params.data.value[2]}万元`;
      },
    },
    visualMap: {
      max: max,
      min: min,
      inRange: {
        color: [
          "#313695",
          "#4575b4",
          "#74add1",
          "#abd9e9",
          "#e0f3f8",
          "#ffffbf",
          "#fee090",
          "#fdae61",
          "#f46d43",
          "#d73027",
          "#a50026",
        ],
      },
    },
    xAxis3D: {
      type: "category",
      data: cities,
      name: "城市",
      axisLabel: {
        interval: 0, 
      },
    },
    yAxis3D: {
      type: "category",
      data: years,
      name: "年份",
      axisLabel: {
        interval: 0, 
      },
    },
    zAxis3D: {
      type: "value",
      name: "销售额",
    },
    grid3D: {
      boxWidth: cities.length * 8,
      boxDepth: years.length * 8,
      boxHeight: 60,
      light: {
        main: {
          intensity: 1.2,
        },
        ambient: {
          intensity: 0.3,
        },
      },
    },
    series: [
      {
        type: "bar3D",
        data: data.map(function (item) {
          return {
            value: [item[1], item[0], item[2]],
          };
        }),
        shading: "color",
        label: {
          show: false,
          fontSize: 16,
          borderWidth: 1,
        },
        itemStyle: {
          opacity: 0.4,
        },
        emphasis: {
          label: {
            fontSize: 20,
            color: "#900",
          },
          itemStyle: {
            color: "#900",
          },
        },
      },
    ],
    textStyle: {
      fontFamily: "sans-serif",
      fontSize: 12,
    },
    axisPointer: {},
  };
}
function findMinMax(arr: number[][]): { min: number; max: number } {
  // To extract the value of the third item
  const thirdItems = arr.map((item) => item[2]);

  // Find the minimum and maximum values
  const min = Math.min(...thirdItems);
  const max = Math.max(...thirdItems);

  return { min, max };
}