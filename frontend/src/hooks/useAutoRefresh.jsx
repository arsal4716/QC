import { useEffect, useRef } from 'react';


export default function useAutoRefresh(enabled, intervalMs, callback) {
const cbRef = useRef(callback);
useEffect(() => { cbRef.current = callback; }, [callback]);


useEffect(() => {
if (!enabled) return;
const id = setInterval(() => cbRef.current(), intervalMs);
return () => clearInterval(id);
}, [enabled, intervalMs]);
}