import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  noPadding?: boolean;
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  noPadding = false,
  compact = false,
  className = '',
  children,
}) => {
  const classNames = [
    styles.card,
    variant !== 'default' ? styles[variant] : '',
    noPadding ? styles.noPadding : '',
    compact ? styles.compact : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames}>{children}</div>;
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`${styles.cardHeader} ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {description && <p className={styles.cardDescription}>{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ className = '', children }) => {
  return <div className={`${styles.cardContent} ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<CardFooterProps> = ({ className = '', children }) => {
  return <div className={`${styles.cardFooter} ${className}`}>{children}</div>;
};

export default Card;
