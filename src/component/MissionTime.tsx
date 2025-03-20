import React, { useState, useEffect } from "react";

interface MissionTimeProps {
  setTime?: string;
}

export const MissionTime: React.FC<MissionTimeProps> = ({ setTime }) => {
  const [currentTime, setCurrentTime] = useState("");
  const [initialOffset, setInitialOffset] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (setTime && setTime.trim()) {
      const [hours, minutes, seconds] = setTime.split(":").map(Number);
      const setTimeMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

      const now = new Date();
      const currentUTCMs =
        (now.getUTCHours() * 3600 +
          now.getUTCMinutes() * 60 +
          now.getUTCSeconds()) *
        1000;

      let offset = setTimeMs - currentUTCMs;

      // ✅ 음수가 나오면 24시간을 더해 양수로 보정
      if (offset < 0) offset += 24 * 60 * 60 * 1000;

      setInitialOffset(offset);
      setStartTime(Date.now());
    }
  }, [setTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const updateTime = () => {
      const now = new Date();

      if (initialOffset !== null && startTime !== null) {
        const elapsedMs = Date.now() - startTime;
        let totalOffsetMs = initialOffset + elapsedMs;
        const dayMs = 24 * 60 * 60 * 1000;

        totalOffsetMs %= dayMs; // 24시간을 초과하면 0부터 다시 시작

        const hours = Math.floor(totalOffsetMs / 3600000);
        const minutes = Math.floor((totalOffsetMs % 3600000) / 60000);
        const seconds = Math.floor((totalOffsetMs % 60000) / 1000);

        setCurrentTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
            2,
            "0"
          )}:${String(seconds).padStart(2, "0")}`
        );
      } else {
        setCurrentTime(
          `${String(now.getUTCHours()).padStart(2, "0")}:${String(
            now.getUTCMinutes()
          ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`
        );
      }
    };

    updateTime(); // 최초 실행 (즉시 반영)
    interval = setInterval(updateTime, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [initialOffset, startTime]);

  return <span>{`UTC ${currentTime}`}</span>;
};