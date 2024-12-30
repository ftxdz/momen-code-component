import { useEffect, useState } from 'react';
import { Table, TableProps } from 'antd';
import { useAppContext } from 'zvm-code-context';
import gqlDoc from '@/graphql/accountListQuery.gql';

export interface DataTablePropData {}

export interface DataTableStateData {}

export interface DataTableEvent {}

export interface DataTableProps {
  propData: DataTablePropData;
  propState: DataTableStateData;
  event: DataTableEvent;
}

export interface DataType {
  id: number;
  username: string;
  created_at: string;
}

export const gql = (_: TemplateStringsArray) => _.join('');

const columns: TableProps<DataType>['columns'] = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
  },
];

export function DataTable({}: DataTableProps) {
  const [data, setData] = useState<Array<DataType>>([]);

  const { query } = useAppContext();

  const variables = {
    where: {
      _and: [],
    },
    orderBy: [
      {
        id: 'desc_nulls_last',
      },
    ],
    distinct_on: [],
  };

  useEffect(() => {
    (async () => {
      const { data } = await query(gqlDoc.loc.source.body, variables);
      setData(data.account);
    })();
  }, []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Table bordered pagination={false} columns={columns} dataSource={data} />
    </div>
  );
}
