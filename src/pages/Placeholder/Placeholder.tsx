import React from 'react';
import styles from './Placeholder.module.css';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title, description }) => {
  return (
    <div className={styles.placeholder}>
      <div className={styles.icon}>
        <Construction size={40} />
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
};

export default Placeholder;
