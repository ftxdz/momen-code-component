import { InputNumber } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { State } from 'zvm-code-context';

export interface AddCalculatorPropData {
  operandLeft?: number;
  operandRight?: number;
}

export interface AddCalculatorEvent {}

export interface AddCalculatorStateData {
  result?: State<number>;
}

export interface AddCalculatorProps {
  event: AddCalculatorEvent;
  propData: AddCalculatorPropData;
  propState: AddCalculatorStateData;
}

export function AddCalculator({ propData, propState }: AddCalculatorProps) {
  const [opLeft, setOpLeft] = useState(propData.operandLeft ?? 0);
  const [opRight, setOpRight] = useState(propData.operandLeft ?? 0);

  const result = useMemo(() => opLeft + opRight, [opLeft, opRight]);

  useEffect(() => {
    propState.result?.set(result);
  }, [result]);

  return (
    <div>
      <InputNumber
        type='number'
        value={opLeft}
        onChange={v => setOpLeft(v || 0)}
      />
      &nbsp;+&nbsp;
      <InputNumber
        type='number'
        value={opRight}
        onChange={v => setOpRight(v || 0)}
      />
    </div>
  );
}
