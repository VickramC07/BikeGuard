import { useEffect, useState } from 'react';

export const useTypingEffect = (content, speed = 80) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      current += 1;
      setDisplayed(content.slice(0, current));
      if (current >= content.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return displayed;
};
