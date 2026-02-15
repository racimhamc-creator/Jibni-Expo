import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatsCard.css';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
  const isPositive = trend === 'up';

  return (
    <div className={`stats-card stats-card--${color}`}>
      <div className="stats-card-header">
        <div className="stats-icon">
          <Icon size={22} />
        </div>
        {trendValue && (
          <div className={`stats-trend ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div className="stats-card-body">
        <h3 className="stats-value">{value}</h3>
        <p className="stats-title">{title}</p>
      </div>
    </div>
  );
};

export default StatsCard;

