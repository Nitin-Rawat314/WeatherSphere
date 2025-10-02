const API_KEY = "d1845658f92b31c64bd94f06f7188c9c";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

let units = "metric";
const statusEl = document.getElementById("status");
const loaderEl = document.getElementById("loader");
const errorEl = document.getElementById("error");
const errorMsg = document.getElementById("errorMsg");
const errorClose = document.getElementById("errorClose");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const cBtn = document.getElementById("cBtn");
const fBtn = document.getElementById("fBtn");

const currentCard = document.getElementById("currentCard");
const forecastCard = document.getElementById("forecastCard");

const cityEl = document.getElementById("city");
const flagEl = document.getElementById("flag");
const descEl = document.getElementById("desc");
const tempEl = document.getElementById("temp");
const feelsEl = document.getElementById("feels");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");
const cloudsEl = document.getElementById("clouds");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const iconEl = document.getElementById("icon");

const forecastGrid = document.getElementById("forecast");

function showLoader() { 
  loaderEl.classList.remove("hidden"); 
  statusEl.textContent = "Loading..."; 
  hideAllCards();
}
function hideLoader() { 
  loaderEl.classList.add("hidden"); 
  statusEl.textContent = "Ready"; 
}
function showError(msg) { 
  errorMsg.textContent = msg || "Something went wrong"; 
  errorEl.classList.remove("hidden"); 
}
function hideError() { 
  errorEl.classList.add("hidden"); 
}

function showCurrent() { 
  currentCard.classList.remove("hidden"); 
}
function showForecast() { 
  forecastCard.classList.remove("hidden"); 
}
function hideAllCards() { 
  currentCard.classList.add("hidden"); 
  forecastCard.classList.add("hidden"); 
}

// FIXED: Correct sunrise/sunset time conversion
function toTime(unix, tzOffset = 0) {
  // Convert UNIX timestamp to milliseconds and add timezone offset (in seconds)
  const date = new Date((unix + tzOffset) * 1000);
  return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", timeZone: 'UTC'});
}

function formatDateShort(unix, tzOffset = 0){
  const date = new Date((unix + tzOffset) * 1000);
  return date.toLocaleDateString([], {weekday:"short", month:"short", day:"numeric"});
}

function getDailyFromForecast(list) {
  const days = {};
  for (const item of list) {
    const d = item.dt_txt.split(" ")[0];
    if (!days[d]) days[d] = [];
    days[d].push(item);
  }
  const result = Object.values(days).map(arr => {
    const midday = arr.reduce((best, cur) => {
      const tcur = new Date(cur.dt * 1000).getHours();
      const tbest = new Date(best.dt * 1000).getHours();
      return Math.abs(tcur - 12) < Math.abs(tbest - 12) ? cur : best;
    }, arr[0]);
    const temps = arr.map(x => x.main.temp);
    return {
      dt: midday.dt,
      icon: midday.weather[0].icon,
      main: midday.weather[0].main,
      temp_min: Math.min(...temps),
      temp_max: Math.max(...temps),
    };
  });
  return result.slice(0, 5);
}

function setUnits(u) {
  units = u;
  if (u === "metric") { 
    cBtn.classList.add("current"); 
    fBtn.classList.remove("current"); 
  } else { 
    fBtn.classList.add("current"); 
    cBtn.classList.remove("current"); 
  }
}

// ===== FETCH FUNCTIONS =====
async function fetchWeatherByCoords(lat, lon) {
  try {
    showLoader();
    hideError();
    
    const r = await fetch(`${WEATHER_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Failed to fetch weather");
    
    renderCurrent(data);
    
    const f = await fetch(`${FORECAST_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`);
    const fd = await f.json();
    
    if (f.ok) {
      renderForecast(fd.list, fd.city ? fd.city.timezone : 0);
    } else {
      throw new Error(fd.message || "Failed to fetch forecast");
    }
    
    hideLoader();
    saveLast({ type: "coords", lat, lon });
    
  } catch (err) {
    hideLoader();
    showError(err.message);
    console.error(err);
  }
}

async function fetchWeatherByCity(city) {
  try {
    showLoader();
    hideError();
    
    const r = await fetch(`${WEATHER_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "City not found");
    
    renderCurrent(data);
    
    const f = await fetch(`${FORECAST_URL}?lat=${data.coord.lat}&lon=${data.coord.lon}&units=${units}&appid=${API_KEY}`);
    const fd = await f.json();
    
    if (f.ok) {
      renderForecast(fd.list, fd.city ? fd.city.timezone : 0);
    } else {
      throw new Error(fd.message || "Failed to fetch forecast");
    }
    
    hideLoader();
    saveLast({ type: "city", city: data.name, coord: data.coord });
    
  } catch (err) {
    hideLoader();
    showError(err.message);
    console.error(err);
  }
}

// ===== RENDER =====
function renderCurrent(data) {
  hideError();
  showCurrent();
  
  cityEl.textContent = `${data.name}, ${data.sys.country}`;
  flagEl.src = `https://flagcdn.com/48x36/${data.sys.country.toLowerCase()}.png`;
  flagEl.alt = data.sys.country;
  descEl.textContent = (data.weather && data.weather[0] && data.weather[0].description) ? capitalize(data.weather[0].description) : "-";
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  iconEl.alt = data.weather[0].description || "weather";
  tempEl.textContent = `${Math.round(data.main.temp)}°${units === "metric" ? "C" : "F"}`;
  feelsEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} ${units === "metric" ? "m/s" : "mph"}`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  cloudsEl.textContent = `${data.clouds.all}%`;
  
  // FIXED: Correct sunrise/sunset display
  const tz = data.timezone || 0;
  sunriseEl.textContent = toTime(data.sys.sunrise, tz);
  sunsetEl.textContent = toTime(data.sys.sunset, tz);
}

function renderForecast(list, tzOffset = 0) {
  showForecast();
  forecastGrid.innerHTML = "";
  const daily = getDailyFromForecast(list);
  for (const d of daily) {
    const el = document.createElement("div");
    el.className = "forecast-item"; // Fixed class name
    el.innerHTML = `
      <div class="day">${formatDateShort(d.dt, tzOffset)}</div>
      <img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="${d.main}" />
      <div class="temp-range"><strong>${Math.round(d.temp_max)}° / ${Math.round(d.temp_min)}°</strong></div>
      <div style="color:rgba(230,238,246,0.8); font-size: 0.8rem;">${d.main}</div>
    `;
    forecastGrid.appendChild(el);
  }
}

// ===== UTIL =====
function capitalize(s) { 
  if (!s) return s; 
  return s[0].toUpperCase() + s.slice(1); 
}

function saveLast(obj) {
  localStorage.setItem("weather-last", JSON.stringify(obj));
}

function loadLast() {
  try {
    const raw = localStorage.getItem("weather-last");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { 
    return null; 
  }
}

// ===== EVENTS =====
searchBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  fetchWeatherByCity(q);
  searchInput.value = '';
});

searchInput.addEventListener("keydown", (e) => { 
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click(); 
  }
});

locBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation not supported by this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
  }, err => {
    showError("Location permission denied or unavailable");
  }, { timeout: 10000 });
});

cBtn.addEventListener("click", () => {
  if (units === "metric") return;
  setUnits("metric");
  reloadWithUnits();
});

fBtn.addEventListener("click", () => {
  if (units === "imperial") return;
  setUnits("imperial");
  reloadWithUnits();
});

errorClose.addEventListener("click", () => hideError());

function reloadWithUnits() {
  const last = loadLast();
  if (!last) return;
  if (last.type === "coords") {
    fetchWeatherByCoords(last.lat, last.lon);
  } else if (last.type === "city") {
    fetchWeatherByCity(last.city);
  }
}

(function init() {
  setUnits(units);
  
  statusEl.textContent = "Search a city or click 'My Location'";
  
})();