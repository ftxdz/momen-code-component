import { useAppContext } from "zvm-code-context";
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useState, useEffect } from 'react';
const gql = (_: TemplateStringsArray) => _.join("");

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export interface SalesDashboardPropData {
  /**
   * Selected date
   */
  selectedDate: string;
}

export interface SalesDashboardStateData {}

export interface SalesDashboardEvent {
}

interface SalesDashboardProps {
  propData: SalesDashboardPropData;
  propState: SalesDashboardStateData;
  event: SalesDashboardEvent;
}

interface Sale {
  sale_date: string;
  amount: number;
  region: string;
  product_name: string;
}

const SALES_QUERY = gql`
  query GetSales {
    sales {
      sale_date
      amount
      region
      product_name
    }
  }
`;

export function SalesDashboard({ propData }: SalesDashboardProps) {
    console.log("SalesDashboard", propData.selectedDate);
  const { query } = useAppContext();
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await query(SALES_QUERY, {});
        setSalesData(data.sales);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const filteredData = salesData.filter((sale: Sale) => 
    sale.sale_date.startsWith(propData.selectedDate.replace(/\//g, '-'))
  );

  // 按产品统计销售额
  const salesByProduct = {
    labels: filteredData.map(sale => sale.product_name),
    datasets: [{
      label: 'Sales Amount',
      data: filteredData.map(sale => sale.amount),
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }]
  };

  // 按地区统计销售额
  const salesByRegion = {
    labels: Array.from(new Set(filteredData.map(sale => sale.region))),
    datasets: [{
      data: Array.from(
        filteredData.reduce((acc, sale) => {
          acc.set(sale.region, (acc.get(sale.region) || 0) + sale.amount);
          return acc;
        }, new Map())
      ).map(([_, value]) => value),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
      ],
    }]
  };

  // 按日期统计销售额
  const salesByDate = {
    labels: Array.from(
      new Set(salesData.map(sale => sale.sale_date))
    ).sort(),
    datasets: [{
      label: 'Daily Sales',
      data: Array.from(
        salesData.reduce((acc, sale) => {
          acc.set(sale.sale_date, (acc.get(sale.sale_date) || 0) + sale.amount);
          return acc;
        }, new Map())
      ).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, value]) => value),
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      tension: 0.1
    }]
  };

  // 计算总销售额
  const totalSales = filteredData.reduce((sum, sale) => sum + sale.amount, 0);
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sales Statistics',
        font: { size: 16 }
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {filteredData.length > 0 ? (
        <>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-700">Sales Overview</h2>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ¥{totalSales.toLocaleString()}
            </p>
            <p className="text-gray-500">Total Sales</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Daily Sales Trend</h3>
              <Line options={chartOptions} data={salesByDate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Product Sales Trend</h3>
                <Bar options={chartOptions} data={salesByProduct} />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Regional Sales Distribution</h3>
                <Doughnut 
                  data={salesByRegion}
                  options={{
                    ...chartOptions,
                    cutout: '60%'
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          No sales data for selected date
        </div>
      )}
    </div>
  );
} 