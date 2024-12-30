import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { demoOption } from './options';

export interface DemoChartPropData {}

export interface DemoChartStateData {}

export interface DemoChartEvent {}

export interface DemoChartProps {
  propData: DemoChartPropData;
  propState: DemoChartStateData;
  event: DemoChartEvent;
}

export function DemoChart({}: DemoChartProps) {
  const option = useMemo(() => demoOption, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactECharts option={option} />
    </div>
  );
}
