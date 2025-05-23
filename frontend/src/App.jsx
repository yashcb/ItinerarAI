import { useState, useEffect } from 'react';
import './App.css';
import './styles.css';
import { FaCalendarAlt, FaMapMarkerAlt, FaPlane, FaUtensils, FaBed, FaInfoCircle } from 'react-icons/fa';
import LoadingOverlay from './components/LoadingOverlay';
import ReactMarkdown from 'react-markdown';

function App() {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripType, setTripType] = useState('holiday');
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setItinerary(null);
    setLocationInfo(null);
    setWeatherInfo(null);
    setTaskId(null);

    // Validate inputs
    if (!location || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Start the itinerary generation process
      const response = await fetch('http://localhost:8000/generate-itinerary/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          start_date: startDate,
          end_date: endDate,
          trip_purpose: tripType,
          track_progress: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start itinerary generation');
      }
      
      const { task_id } = await response.json();
      setTaskId(task_id);
      
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="text-center mb-8">
        <h1>AI Travel Companion</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Plan your perfect trip with AI-powered recommendations. Get personalized itineraries, local insights, and travel tips.
        </p>
      </header>
      <div className="background-graphic bg-circle bg-circle-1"></div>
      <div className="background-graphic bg-circle bg-circle-2"></div>
      <div className="background-graphic bg-circle bg-circle-3"></div>
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
        
        <div className="form-group">
          <label htmlFor="tripType">Trip Type:</label>
          <div className="card max-w-3xl mx-auto mb-8">
            <select
              id="tripType"
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              className="trip-type-select"
              required
            >
              <option value="holiday">🌴 Holiday</option>
              <option value="business">💼 Business</option>
              <option value="adventure">🏔️ Adventure</option>
              <option value="family">👨‍👩‍👧‍👦 Family</option>
              <option value="romantic">💑 Romantic Getaway</option>
              <option value="other">✨ Other</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? (
            'Please wait...'
          ) : (
            'Search'
          )}
        </button>
      </form>

      <LoadingOverlay 
        isLoading={isLoading} 
        taskId={taskId}
        onComplete={(result) => {
          if (result) {
            setLocationInfo({
              name: result.location,
              description: result.location_description,
              latitude: result.latitude,
              longitude: result.longitude
            });
            setWeatherInfo(result.weather_forecast);
            setItinerary({
              itinerary: result.itinerary,
              location: result.location,
              start_date: result.start_date,
              end_date: result.end_date,
              trip_purpose: result.trip_purpose
            });
            setActiveTab('itinerary');
          }
          setIsLoading(false);
        }} 
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {(locationInfo || weatherInfo || itinerary) && (
        <div className="results">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              <FaPlane /> Itinerary
            </button>
            <button 
              className={`tab ${activeTab === 'location' ? 'active' : ''}`}
              onClick={() => setActiveTab('location')}
            >
              <FaMapMarkerAlt /> Location
            </button>
            <button 
              className={`tab ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => setActiveTab('weather')}
            >
              <FaCalendarAlt /> Weather
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'itinerary' && itinerary && (
              <div className="itinerary-container fade-in">
                <div className="scrollable-content">
                  <div className="markdown-content">
                    <ReactMarkdown>{itinerary.itinerary}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && locationInfo && (
              <div className="info-card">
                <h2><FaMapMarkerAlt /> Location Information</h2>
                <p><strong>Name:</strong> {locationInfo.name || 'N/A'}</p>
                <p><strong>Address:</strong> {locationInfo.description || 'N/A'}</p>
                {locationInfo.latitude && locationInfo.longitude && (
                  <p><strong>Coordinates:</strong> {locationInfo.latitude.toFixed(4)}, {locationInfo.longitude.toFixed(4)}</p>
                )}
              </div>
            )}

            {activeTab === 'weather' && weatherInfo && (
              <div className="info-card">
                <h2><FaCalendarAlt /> Weather Information</h2>
                <div className="weather-grid">
                  <div className="weather-item">
                    <span className="weather-label">Temperature</span>
                    <span className="weather-value">{Math.round(weatherInfo.main?.temp)}°C</span>
                  </div>
                  <div className="weather-item">
                    <span className="weather-label">Conditions</span>
                    <span className="weather-value">{weatherInfo.weather?.[0]?.description}</span>
                  </div>
                  <div className="weather-item">
                    <span className="weather-label">Humidity</span>
                    <span className="weather-value">{weatherInfo.main?.humidity}%</span>
                  </div>
                  <div className="weather-item">
                    <span className="weather-label">Wind</span>
                    <span className="weather-value">{weatherInfo.wind?.speed} m/s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
