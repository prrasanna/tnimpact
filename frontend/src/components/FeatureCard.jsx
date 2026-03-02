// Home page feature card.
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/70">
      <Icon className="mb-3 text-blue-600 dark:text-emerald-400" size={24} />
      <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}

export default FeatureCard;
