// src/config/foodMapping.js

const foodMapping = {
  burger: ['hamburger'],
  cheeseburger: ['hamburger'],
  pizza: ['pizza'],
  fries: ['french_fries'],
  french_fries: ['french_fries'],
  hotdog: ['hot_dog'],
  hot_dog: ['hot_dog'],
  icecream: ['ice_cream'],
  ice_cream: ['ice_cream'],
  donut: ['donuts'],
  tacos: ['tacos'],
  nachos: ['nachos'],
  sushi: ['sushi'],
  onion_rings: ['onion_rings'],
  garlic_bread: ['garlic_bread'],
  spaghetti: ['spaghetti_bolognese', 'spaghetti_carbonara'],
  macaroni: ['macaroni_and_cheese'],
  pancakes: ['pancakes'],
  waffles: ['waffles'],
  tiramisu: ['tiramisu'],
  cheesecake: ['strawberry_food', 'red_velvet_cake'],
  salad: ['caesar_salad', 'caprese_salad', 'beet_salad', 'seaweed_salad']
};

function getExpectedFoodLabels(itemName) {
  if (!itemName) return [];
  const sanitized = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const labels = [];
  
  for (const key in foodMapping) {
    if (sanitized.includes(key)) {
      labels.push(...foodMapping[key]);
    }
  }
  
  return [...new Set(labels)];
}

module.exports = {
  foodMapping,
  getExpectedFoodLabels
};
