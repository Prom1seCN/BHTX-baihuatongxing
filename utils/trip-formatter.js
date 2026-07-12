function formatTrip(item) {
  if (!item) return null;
  const tripType = item.tripType || 'scheduled';
  let minutesLeft = '';
  if (tripType === 'immediate' && item.date && item.time) {
    const departureTime = new Date(`${item.date}T${item.time}:00`).getTime();
    const diff = Math.ceil((departureTime - Date.now()) / 60000);
    minutesLeft = diff > 0 ? `${diff}分钟后出发` : '即将出发';
  }
  return {
    ...item,
    id: item._id || item.id,
    departure: item.from,
    destination: item.to,
    exact_date: item.date,
    departure_time: item.time,
    tripType,
    displayDate: formatDateCN(item.date),
    displayTime: item.time,
    remark: item.remark || '',
    minutesLeft
  };
}

function formatDateCN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}月${day}日`;
}

function formatTripList(list) {
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    for (const key in list) {
      if (Array.isArray(list[key])) {
        list = list[key];
        break;
      }
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map(formatTrip);
}

function getTripTimestamp(trip) {
  if (!trip) return 0;
  const date = trip.exact_date || trip.date;
  const time = trip.departure_time || trip.time;
  if (!date || !time) return 0;
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

module.exports = {
  formatTrip,
  formatTripList,
  formatDateCN,
  getTripTimestamp
};
