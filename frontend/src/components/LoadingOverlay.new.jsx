import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FaMapMarkerAlt, FaCloudSun, FaRoute, FaMagic, FaCheck, FaSpinner } from 'react-icons/fa';

const LoadingOverlay = ({ isLoading, onComplete, taskId }) => {
  const [progressData, setProgressData] = useState({
    status: 'not_started',
    progress: 0,
    current_step: '',
    result: null,
    error: null
  });
  
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const checkInterval = useRef(null);
  const tipInterval = useRef(null);
  
  // Define loading steps with their progress ranges
  const loadingSteps = useMemo(() => [
    { 
      id: 'initializing',
      text: 'Initializing', 
      icon: <FaSpinner className="step-icon" />,
      progressRange: [0, 10]
    },
    { 
      id: 'location',
      text: 'Fetching location details', 
      icon: <FaMapMarkerAlt className="step-icon" />,
      progressRange: [10, 30]
    },
    { 
      id: 'weather',
      text: 'Analyzing weather conditions', 
      icon: <FaCloudSun className="step-icon" />,
      progressRange: [30, 50]
    },
    { 
      id: 'generating',
      text: 'Generating your perfect itinerary', 
      icon: <FaMagic className="step-icon" />,
      progressRange: [50, 90]
    },
    { 
      id: 'finalizing',
      text: 'Finalizing details', 
      icon: <FaRoute className="step-icon" />,
      progressRange: [90, 100]
    }
  ], []);

  // Tips to show during loading
  const tips = useMemo(() => [
    'Pro tip: Check the weather forecast before packing!',
    'Did you know? Weekday travel is often cheaper than weekends.',
    'Travel tip: Always carry a portable charger for your devices.',
    'Local tip: Ask locals for their favorite restaurants to find hidden gems.',
    'Packing tip: Roll your clothes to save space in your luggage.'
  ], []);

  // Get a random tip
  const getRandomTip = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
  }, [tips]);

  // Check progress from the backend
  const checkProgress = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/itinerary/status/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      
      const data = await response.json();
      setProgressData(data);
      
      // If task is complete, stop checking
      if (data.status === 'completed' || data.status === 'failed') {
        if (checkInterval.current) {
          clearInterval(checkInterval.current);
          checkInterval.current = null;
        }
        
        // If there's a result, call onComplete after a delay
        if (data.status === 'completed' && data.result) {
          setTimeout(() => {
            if (onComplete) onComplete(data.result);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error checking progress:', error);
    }
  }, [taskId, onComplete]);

  // Start/stop progress checking when taskId changes
  useEffect(() => {
    if (!taskId) return;
    
    // Initial check
    checkProgress();
    
    // Set up interval for checking progress
    checkInterval.current = setInterval(checkProgress, 1000);
    
    // Clean up on unmount or when taskId changes
    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [taskId, checkProgress]);
  
  // Handle loading state changes
  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      
      // Set initial tip
      setCurrentTip(getRandomTip());
      
      // Change tip every 8 seconds (less frequent)
      tipInterval.current = setInterval(() => {
        setCurrentTip(getRandomTip());
      }, 8000);
    } else {
      // Fade out when loading is complete
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (tipInterval.current) {
        clearInterval(tipInterval.current);
        tipInterval.current = null;
      }
    };
  }, [isLoading, getRandomTip]);
  
  // Calculate which step is currently active based on progress
  const activeStepIndex = useMemo(() => {
    const progress = progressData.progress || 0;
    return loadingSteps.reduce((activeIndex, step, index) => {
      return progress >= step.progressRange[0] ? index : activeIndex;
    }, 0);
  }, [progressData.progress, loadingSteps]);

  if (!isLoading && !isVisible) return null;

  return (
    <div className={`loading-overlay ${!isLoading ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-header">
          <h2>Creating Your Perfect Itinerary</h2>
          {currentTip && <p className="loading-tip">💡 {currentTip}</p>}
        </div>
        
        <div className="loading-steps">
          {loadingSteps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = index < activeStepIndex || 
                              (activeStepIndex === index && progressData.status === 'completed');
            const isFailed = progressData.status === 'failed' && index === loadingSteps.length - 1;
            
            // Calculate progress for the current step
            const stepProgress = isActive 
              ? ((progressData.progress - step.progressRange[0]) / 
                 (step.progressRange[1] - step.progressRange[0])) * 100
              : isCompleted ? 100 : 0;
            
            return (
              <div 
                key={step.id}
                className={`loading-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-icon-container">
                  {isCompleted ? (
                    <FaCheck className="step-icon" />
                  ) : isFailed ? (
                    <span className="error-icon">✕</span>
                  ) : isActive ? (
                    <FaSpinner className="step-icon spinning" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="step-text">
                  <span>{step.text}</span>
                  {isActive && (
                    <div className="step-progress">
                      <div 
                        className={`step-progress-bar ${isFailed ? 'error' : ''}`}
                        style={{ width: `${Math.min(100, Math.max(0, stepProgress))}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="progress-container">
          <div 
            className={`progress-bar ${progressData.status === 'failed' ? 'error' : ''}`} 
            style={{ width: `${progressData.progress || 0}%` }}
          />
          <div className="progress-text">
            {progressData.status === 'failed' 
              ? 'Error: ' + (progressData.error || 'Failed to generate itinerary')
              : `${Math.round(progressData.progress || 0)}%`}
          </div>
        </div>
        
        {progressData.status === 'failed' && (
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
