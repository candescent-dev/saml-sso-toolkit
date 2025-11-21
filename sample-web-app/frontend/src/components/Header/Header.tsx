import React, { FC } from 'react';
import styles from './Header.module.css';
import headerImage from '../../assets/header-image.svg';

const Header: FC = () => {
  return (
    <header className={styles.header}>
      <img src={headerImage} className={styles.headerImg} alt="Candescent Logo" loading="lazy" />
    </header>
  );
};

export default Header;
