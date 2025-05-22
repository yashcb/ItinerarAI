import { useState } from 'react';
import './App.css';
import './styles.css';
import { FaSpinner } from 'react-icons/fa';

function App() {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!location || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Get location info
      const locationResponse = await fetch('http://localhost:8000/location-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      const locationData = await locationResponse.json();
      
      if (!locationResponse.ok) {
        throw new Error(locationData.detail || 'Failed to get location info');
      }
      
      setLocationInfo(locationData);

      // Get weather info
      const weatherResponse = await fetch('http://localhost:8000/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: locationData.result.geometry.location.lat,
          longitude: locationData.result.geometry.location.lng,
        }),
      });

      const weatherData = await weatherResponse.json();
      
      if (!weatherResponse.ok) {
        throw new Error(weatherData.detail || 'Failed to get weather data');
      }
      
      setWeatherInfo(weatherData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="background-graphic bg-circle bg-circle-1"></div>
      <div className="background-graphic bg-circle bg-circle-2"></div>
      <div className="background-graphic bg-circle bg-circle-3"></div>
      <h1 className="gradient-text">AI Travel Companion</h1>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              Fetching data...
            </>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {error && (
        <div className="error">
          <FaSpinner className="animate-spin" />
          {error}
        </div>
      )}

      {locationInfo && locationInfo.result && (
        <div className="results">
          <div className="info-card">
            <h2>Location Information</h2>
            <p>Name: {locationInfo.result.name}</p>
            <p>Address: {locationInfo.result.formatted_address}</p>
            <p>Latitude: {locationInfo.result.geometry.location.lat}</p>
            <p>Longitude: {locationInfo.result.geometry.location.lng}</p>
          </div>
        </div>
      )}

      {weatherInfo && (
        <div className="results">
          <div className="info-card">
            <h2>Weather Information</h2>
            <p>Temperature: {weatherInfo.main?.temp}°C</p>
            <p>Weather: {weatherInfo.weather?.[0]?.description}</p>
            <p>Humidity: {weatherInfo.main?.humidity}%</p>
            <p>Wind Speed: {weatherInfo.wind?.speed} m/s</p>
            <p>Pressure: {weatherInfo.main?.pressure} hPa</p>
            <p>Location: {weatherInfo.name}</p>
            <p>Country: {weatherInfo.sys?.country}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
