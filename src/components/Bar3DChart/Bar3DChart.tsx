import { useEffect, useState } from 'react';
import { fetchDemoOptionData } from './options';
import * as echarts from 'echarts';
import 'echarts-gl';
export interface Bar3DChartPropData {
  cityName: string;
  year: string;
}

export interface Bar3DChartStateData {}

export interface Bar3DChartEvent {}

export interface Bar3DChartProps {
  propData: Bar3DChartPropData;
  propState: Bar3DChartStateData;
  event: Bar3DChartEvent;
}

export function Bar3DChart({ propData }: Bar3DChartProps) {
  const [option] = useState<any>(null);

  useEffect(() => {
    async function fetchData(propData: Bar3DChartPropData) {
      const option = await fetchDemoOptionData(propData);
      const chartDom = document.getElementById('__Bar3DChart__container ');
      if (chartDom) {
        const myChart = echarts.init(chartDom);
        myChart.setOption(option);
        const handleResize = () => {
          myChart.resize();
        };

        window.addEventListener('resize', handleResize);

        // Clear side effects
        return () => {
          myChart.dispose();
          window.removeEventListener('resize', handleResize);
        };
      }
    }

    fetchData(propData);
  }, [option, propData]);

  return (
    <div
      id='__Bar3DChart__container'
      style={{ width: '100%', height: '100%' }}
    />
  );
}
