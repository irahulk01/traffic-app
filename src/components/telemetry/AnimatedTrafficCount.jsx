import { useLayoutEffect, useRef, useState } from 'react';

export default function AnimatedTrafficCount({ value }) {
  const lastValue = useRef(value);
  const [previous, setPrevious] = useState(null);
  useLayoutEffect(() => {
    if (lastValue.current === value) return;
    setPrevious(lastValue.current);
    lastValue.current = value;
    const timer = setTimeout(() => setPrevious(null), 320);
    return () => clearTimeout(timer);
  }, [value]);
  // The button's accessible label always contains the actual latest count.
  // Only the real previous/new values are drawn; no invented intermediate totals.
  return <span className="traffic-count-window" aria-hidden="true">
    {previous !== null && <span key={`old:${previous}:${value}`} className="traffic-count-outgoing">{previous}</span>}
    <span key={`current:${value}`} className={previous !== null ? 'traffic-count-incoming' : ''}>{value}</span>
  </span>;
}
