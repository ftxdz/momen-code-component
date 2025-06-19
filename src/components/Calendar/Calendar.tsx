import { useEffect, useRef, useState } from "react";
import { useAppContext } from "zvm-code-context";
import TuiCalendar from "@toast-ui/calendar";
import "@toast-ui/calendar/dist/toastui-calendar.min.css";
import { GQL_GET_TASK } from "./getTask";
import styles from "./Calendar.module.css";

export interface CalendarPropData {
  refreshKey: number; // 新增参数，用于触发刷新
}

export interface CalendarStateData {}

export interface CalendarEvent {}

export interface CalendarProps {
  propData: CalendarPropData;
  propState: CalendarStateData;
  event: CalendarEvent;
}

// 日历类型配置，只维护一份
const calendarTypes = [
  {
    id: "Personal/Other - Custom messages",
    name: "Personal/Other - Custom messages",
    backgroundColor: "#03bd9e",
    borderColor: "#03bd9e"
  },
  {
    id: "Learning - Knowledge Reinforcement",
    name: "Learning - Knowledge Reinforcement",
    backgroundColor: "#00a9ff",
    borderColor: "#00a9ff"
  },
  {
    id: "Reflection - Journaling & gratitude",
    name: "Reflection - Journaling & gratitude",
    backgroundColor: "#ffbb3b",
    borderColor: "#ffbb3b"
  },
  {
    id: "Motivation - Inspirational content",
    name: "Motivation - Inspirational content",
    backgroundColor: "#ff4040",
    borderColor: "#ff4040"
  },
  {
    id: "Habits - Regular routine prompts",
    name: "Habits - Regular routine prompts",
    backgroundColor: "#8e44ad",
    borderColor: "#8e44ad"
  },
  {
    id: "Reminder - Time-based notification",
    name: "Reminder - Time-based notification",
    backgroundColor: "#16a085",
    borderColor: "#16a085"
  }
];

// allowedPurposes 直接从 calendarTypes 派生
const allowedPurposes = calendarTypes.map(c => c.id);

export function Calendar({ propData }: CalendarProps) {
  const { query } = useAppContext();
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstance = useRef<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 获取任务数据的函数
  const fetchTask = async () => {
    const { data } = await query(GQL_GET_TASK, {});
    return data.send_sms_record.length > 0 ? data.send_sms_record : [];
  };

  // 将任务数据转换为日历事件格式的函数
  const transformTasksToEvents = (tasks: any[]) => {
    return tasks.map((task, index) => {
      // 获取purpose完整内容
      const rawPurpose = task.task?.purpose;
      // 判断purpose是否在允许列表中，否则用默认值
      const calendarId = allowedPurposes.includes(rawPurpose)
        ? rawPurpose
        : "Personal/Other - Custom messages";

      // category字段统一为'time'，并用const断言保证类型兼容
      const category = 'time' as const;

      // 设置事件时间，如果没有 send_datetime 则使用当前时间
      const eventDate = task.send_datetime 
        ? new Date(task.send_datetime)
        : new Date();
      // 保留原始时间
      const startTime = new Date(eventDate);
      const endTime = new Date(eventDate);

      return {
        id: `task-${task.id || index}`,
        calendarId: calendarId, // 现在的category内容（purpose或默认值）
        // 标题优先级：content > task.content > task.description > 无标题任务
        title:
          task.content ||
          task.task?.content ||
          task.task?.description ||
          "无标题任务",
        category: category, // 统一为'time'
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        // 事件描述
        body: task.task?.description || task.task?.purpose || "",
        // 电话号码
        location: task.task?.recipient_phone_number || "",
      };
    });
  };

  useEffect(() => {
    if (calendarRef.current) {
      const calendar = new TuiCalendar(calendarRef.current, {
        defaultView: "month",
        useDetailPopup: true,
        isReadOnly: true,
        usageStatistics: false,
        calendars: calendarTypes,
      });

      // 异步获取任务数据并创建事件
      const loadTasksAndCreateEvents = async () => {
        try {
          const tasks = await fetchTask();
          const events = transformTasksToEvents(tasks);

          // 创建日历事件
          if (events.length > 0) {
            calendar.createEvents(events);
          }
        } catch (error) {
          console.error("加载任务数据失败:", error);
        }
      };

      // 执行加载任务和创建事件
      loadTasksAndCreateEvents();

      calendarInstance.current = calendar;
      // 初始化时设置当前年月
      const tzDate = calendar.getDate();
      setCurrentDate(new Date(tzDate.toDate()));
      // 切换月份时更新年月
      calendar.on("afterRenderSchedule", () => {
        const tzDate = calendar.getDate();
        setCurrentDate(new Date(tzDate.toDate()));
      });
      return () => calendar.destroy();
    }
  }, [propData.refreshKey]); // 依赖refreshKey参数变化

  // 切换月份
  const handlePrev = () => {
    if (calendarInstance.current) {
      calendarInstance.current.prev();
      const tzDate = calendarInstance.current.getDate();
      setCurrentDate(new Date(tzDate.toDate()));
    }
  };
  const handleNext = () => {
    if (calendarInstance.current) {
      calendarInstance.current.next();
      const tzDate = calendarInstance.current.getDate();
      setCurrentDate(new Date(tzDate.toDate()));
    }
  };
  const handleToday = () => {
    if (calendarInstance.current) {
      calendarInstance.current.today();
      const tzDate = calendarInstance.current.getDate();
      setCurrentDate(new Date(tzDate.toDate()));
    }
  };

  return (
    <div className={styles.calendarContainer}>
      {/* 顶部菜单栏 */}
      <div className={styles.calendarHeader}>
        <button onClick={handleToday} className={styles.todayBtn}>
          Today
        </button>
        <button onClick={handlePrev} className={styles.arrowBtn}>
          {"<"}
        </button>
        <button onClick={handleNext} className={styles.arrowBtn}>
          {">"}
        </button>
        <span className={styles.yearMonth}>
          {`${currentDate.getFullYear()}.${String(
            currentDate.getMonth() + 1
          ).padStart(2, "0")}`}
        </span>
      </div>
      {/* 日历主体 */}
      <div ref={calendarRef} style={{ flex: 1 }} />
    </div>
  );
}
