# GradientBlur 组件

一个具有渐变背景和模糊效果的组件。

## 特性

- 固定尺寸：1087px × 676px
- 渐变背景：从蓝色到紫色到青色到绿色的渐变
- 模糊效果：50px 的模糊滤镜
- 圆角边框：16px 圆角
- 支持自定义样式和类名

## 使用方法

```tsx
import GradientBlur from './components/GradientBlur';

// 基础使用
<GradientBlur />

// 包含内容
<GradientBlur>
  <div>你的内容</div>
</GradientBlur>

// 自定义样式
<GradientBlur
  className="custom-class"
  style={{ margin: '20px' }}
>
  <div>自定义内容</div>
</GradientBlur>
```

## 属性

| 属性      | 类型                | 默认值 | 描述            |
| --------- | ------------------- | ------ | --------------- |
| children  | React.ReactNode     | -      | 子元素          |
| className | string              | ''     | 额外的 CSS 类名 |
| style     | React.CSSProperties | {}     | 额外的内联样式  |

## 样式说明

组件使用以下基础样式：

```css
width: 1087px;
height: 676px;
flex-shrink: 0;
border-radius: 16px;
background: linear-gradient(
  90deg,
  #53d6ff -0.55%,
  #d869ff 34.99%,
  #62b4ff 73.33%,
  #5effb1 99.34%
);
filter: blur(50px);
```
