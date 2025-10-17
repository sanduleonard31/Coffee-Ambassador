import { jsonFetch, createElement, lazyLoadImage } from './utils.js';

// Cache DOM elements
const timeline = document.getElementById('timeline');
const JOURNEY_PATH = './media/journey';

// Create timeline card content
const createTimelineCard = (event) => {
  // Use CardStyle from JSON, fallback to 'default' if not specified
  const cardStyle = event.CardStyle || 'default';
  const card = createElement('div', { className: `timeline-card card-${cardStyle}` });
  
  // Add image if available
  if (event.Image) {
    const imgContainer = createElement('div', { className: 'timeline-image' });
    
    // Add value label above the image
    if (cardStyle && cardStyle !== 'default') {
      const valueLabel = createElement('div', {
        className: `value-label value-${cardStyle}`,
        textContent: cardStyle.toUpperCase()
      });
      imgContainer.appendChild(valueLabel);
    }
    
    const img = createElement('img', {
      src: `${JOURNEY_PATH}/${event.Image}`,
      alt: event.Description || 'Journey milestone'
    });
    lazyLoadImage(img);
    
    imgContainer.appendChild(img);
    card.appendChild(imgContainer);
  }
  
  // Add description if available
  if (event.Description) {
    // Split description into main text and subtitle (after the dash)
    const parts = event.Description.split(' - ');
    const mainText = parts[0];
    const subtitle = parts[1] || '';
    
    const descContainer = createElement('div', { className: 'timeline-description' });
    
    const mainDesc = createElement('p', {
      className: 'description-main',
      textContent: mainText
    });
    descContainer.appendChild(mainDesc);
    
    if (subtitle) {
      const subDesc = createElement('p', {
        className: 'description-subtitle',
        textContent: subtitle
      });
      descContainer.appendChild(subDesc);
    }
    
    card.appendChild(descContainer);
  }
  
  return card;
};

// Format month name from number
const getMonthName = (month) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || '';
};

// Parse and sort journey events
const parseJourneyData = (data) => {
  return Object.entries(data)
    .map(([key, eventData]) => ({ key, ...eventData }))
    .sort((a, b) => {
      // Sort by year first (ascending - oldest first)
      if (a.Year !== b.Year) {
        return a.Year - b.Year;
      }
      // Then by month if available (ascending - oldest first)
      return (a.Month || 0) - (b.Month || 0);
    });
};

// Group events by year and month
const groupEventsByYearAndMonth = (events) => {
  const grouped = {};
  
  events.forEach(event => {
    const year = event.Year;
    if (!grouped[year]) {
      grouped[year] = {};
    }
    
    const month = event.Month || 0;
    if (!grouped[year][month]) {
      grouped[year][month] = [];
    }
    
    grouped[year][month].push(event);
  });
  
  return grouped;
};

// Create a year section with expandable months
const createYearSection = (year, monthsData, yearIndex) => {
  const yearSection = createElement('div', { className: 'year-section' });
  
  // Year header (clickable to expand/collapse)
  const yearHeader = createElement('div', { 
    className: 'year-header',
    role: 'button',
    tabIndex: 0,
    'aria-expanded': 'false'
  });
  
  const yearTitle = createElement('h3', {
    className: 'year-title',
    textContent: year
  });
  
  const yearToggle = createElement('span', {
    className: 'year-toggle',
    textContent: '▶'
  });
  
  yearHeader.appendChild(yearTitle);
  yearHeader.appendChild(yearToggle);
  
  // Year content container (collapsed by default)
  const yearContent = createElement('div', { className: 'year-content' });
  
  // Sort months in ascending order (1 to 12, with 0 first for unknown dates)
  const sortedMonths = Object.keys(monthsData).sort((a, b) => {
    const monthA = parseInt(a);
    const monthB = parseInt(b);
    if (monthA === 0) return -1;
    if (monthB === 0) return 1;
    return monthA - monthB;
  });
  
  // Create month containers
  sortedMonths.forEach(month => {
    const events = monthsData[month];
    const monthContainer = createMonthContainer(parseInt(month), events, year);
    yearContent.appendChild(monthContainer);
  });
  
  // Toggle functionality
  yearHeader.addEventListener('click', () => {
    const isExpanded = yearContent.classList.toggle('expanded');
    yearHeader.setAttribute('aria-expanded', isExpanded);
    yearToggle.textContent = isExpanded ? '▼' : '▶';
  });
  
  yearHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      yearHeader.click();
    }
  });
  
  yearSection.appendChild(yearHeader);
  yearSection.appendChild(yearContent);
  
  return yearSection;
};

// Create a month container with all events for that month
const createMonthContainer = (month, events, year) => {
  const monthContainer = createElement('div', { className: 'month-container' });
  
  // Month header
  const monthHeader = createElement('div', { className: 'month-header' });
  const monthName = month === 0 ? 'Date Unknown' : getMonthName(month);
  const monthTitle = createElement('h4', {
    className: 'month-title',
    textContent: monthName
  });
  monthHeader.appendChild(monthTitle);
  
  // Events container
  const eventsContainer = createElement('div', { className: 'month-events' });
  
  events.forEach((event, index) => {
    const card = createTimelineCard(event);
    card.style.animationDelay = `${index * 0.1}s`;
    eventsContainer.appendChild(card);
  });
  
  monthContainer.appendChild(monthHeader);
  monthContainer.appendChild(eventsContainer);
  
  return monthContainer;
};

// Load and render journey timeline
const loadJourney = async () => {
  const content = await jsonFetch(`${JOURNEY_PATH}/content.json`);
  
  if (!content) {
    timeline.innerHTML = '<p class="meta">No journey data found.</p>';
    return;
  }
  
  // Parse and sort events
  const events = parseJourneyData(content);
  
  if (events.length === 0) {
    timeline.innerHTML = '<p class="meta">No journey events available.</p>';
    return;
  }
  
  // Group events by year and month
  const groupedEvents = groupEventsByYearAndMonth(events);
  
  // Clear loading message
  timeline.innerHTML = '';
  
  // Create year sections
  const fragment = document.createDocumentFragment();
  const years = Object.keys(groupedEvents).sort((a, b) => a - b); // Ascending order (oldest first)
  
  years.forEach((year, index) => {
    const yearSection = createYearSection(year, groupedEvents[year], index);
    fragment.appendChild(yearSection);
  });
  
  timeline.appendChild(fragment);
};

// Initialize
document.addEventListener('DOMContentLoaded', loadJourney);

export {};
