import cronstrue from "cronstrue/i18n";
import "cronstrue/locales/zh_CN";
import { CronExpressionParser } from 'cron-parser';


export interface CronDescriptionPropData {
  /**
   * cron表达式字符串，例如: "0 0 12 * * ?"
   */
  expression: string;
  /**
   * 语言，默认为中文
   */
  locale?: string;
  /**
   * 是否显示当前时间匹配状态
   */
  showMatchStatus?: boolean;
}
export interface CronDescriptionStateData {}

export interface CronDescriptionEvent {}

interface CronDescriptionProps {
  propData: CronDescriptionPropData;
  propState: CronDescriptionStateData;
  event: CronDescriptionEvent;
}

export function CronDescription({ propData }: CronDescriptionProps) {
  const checkCurrentTime = (cronExpression: string) => {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      const now = new Date();
      //const next = interval.next().toDate();
      const prev = interval.prev().toDate();
      
      // 检查当前时间是否恰好在执行时间点上（允许1秒误差）
      return Math.abs(now.getTime() - prev.getTime()) < 1000;
    } catch {
      return false;
    }
  };

  try {
    const description = cronstrue.toString(propData.expression, {
      locale: propData.locale ?? "zh_CN",
      verbose: true,
    });
    return (
      <div>
        <span>{description}</span>
        {propData.showMatchStatus && (
          <span style={{ marginLeft: '8px', color: checkCurrentTime(propData.expression) ? 'green' : 'gray' }}>
            {checkCurrentTime(propData.expression) ? '（当前正在执行）' : '（当前未执行）'}
          </span>
        )}
      </div>
    );
  } catch (error) {
    return <span style={{ color: "red" }}>无效的cron表达式</span>;
  }
}
