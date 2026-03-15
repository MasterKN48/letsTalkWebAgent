/**
 * Displays key performance metrics like latency, accuracy, and speed.
 * 
 * @param {Object} metrics - The metrics data object { latency, accuracy, speed }.
 */
export default function MetricsDisplay({ metrics }) {
  const METRICS_DISPLAY = [
    {
      label: "Latency",
      value: metrics.latency,
      icon: "⏱️",
      color: "text-blue-500",
    },
    {
      label: "Accuracy",
      value: metrics.accuracy,
      icon: "🎯",
      color: "text-green-500",
    },
    {
      label: "Speed",
      value: metrics.speed,
      icon: "⚡",
      color: "text-amber-500",
    },
  ];

  return (
    <div className="glass-card p-6 rounded-3xl grid grid-cols-3 gap-8 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
      {METRICS_DISPLAY.map((m) => (
        <div key={m.label} className="flex flex-col items-center">
          <span className="text-2xl mb-1">{m.icon}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {m.label}
          </span>
          <span className="text-lg font-bold dark:text-gray-300">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
