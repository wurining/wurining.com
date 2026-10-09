// 修改此处即可调整首页左栏轨迹；像素均为 CSS px，时间不受帧率影响。
export const profileCursorTrailConfig = {
  holdMs: 150, // 停止移动后的停留时间，ms；建议 100–200。
  fadeMs: 400, // 停留后淡出时间，ms；小点先退，大点在此时间结束时消失。
  cellSizePx: 9, // 点阵间距，px；建议 7–12。
  dotRadiusPx: 4.41, // 最大圆点半径，px；建议不超过间距的一半。
  lightOpacity: 0.55, // 浅色主题最大不透明度，0–1；建议不高于 0.55，文字区域另有保护。
  darkOpacity: 0.78, // 深色主题最大不透明度，0–1；建议不高于 0.42。
  fringePx: { x: 2, y: 1.4 }, // 鼠标附近的 RGB 通道错位，px；建议 1–3。
  flicker: { amount: 0.2, minHz: 5.5 / (2 * Math.PI), maxHz: 10.5 / (2 * Math.PI) }, // 灰度变化幅度 0–1、频率 Hz；建议幅度 0.1–0.2、频率 0.5–2。
  liquify: { intensity: 9, radiusPx: 44.4 }, // 液态形变强度（库单位，建议 6–10）、影响半径 px。
  trailRadiusPx: 62.4, // 官方轨迹画笔半径，px；建议 45–75，侧栏变高也保持此宽度。
  headRadiusPx: 50, // 连续鼠标头的范围，px；建议 40–65，避免慢速移动断续。
  frameRate: 45, // 动画帧率上限，fps；建议 30–60，无输入时停止绘制。
  bottomFadePx: 1500, // 侧栏底部向上渐隐的高度，px；0 关闭渐隐。
  leftFadePx: 60, // 左边向右渐隐的宽度，px；0 独立关闭该边。
  topFadePx: 150, // 顶边向下渐隐的高度，px；0 独立关闭该边。
  rightFadePx: 70, // 右边向左渐隐的宽度，px；0 独立关闭该边。
} as const;

export const profileCursorTrailDurationMs = profileCursorTrailConfig.holdMs + profileCursorTrailConfig.fadeMs;
