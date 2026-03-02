import React from "react";
import { useParams } from "react-router-dom";
import RestaurantDetails from "./RestaurantDetails";

function RestaurantDetailsWrapper() {
  const { id } = useParams();
  return <RestaurantDetails restaurantId={Number(id)} />;
}

export default RestaurantDetailsWrapper;
