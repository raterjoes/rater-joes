// categoryAssets.js
import produceHeader from "./assets/category-banners/produce-header.jpg";
import produceFooter from "./assets/category-banners/produce-footer.jpg";
import frozenHeader from "./assets/category-banners/frozenfoods-header.jpg";
import frozenFooter from "./assets/category-banners/frozenfoods-footer.jpg";
import dessertsHeader from "./assets/category-banners/desserts-header.jpg";
import dessertsFooter from "./assets/category-banners/desserts-footer.jpg"
import seasoningsHeader from "./assets/category-banners/seasonings-header.jpg"
import seasoningsFooter from "./assets/category-banners/seasonings-footer.jpg"
import snacksHeader from "./assets/category-banners/snacks-header.jpg"
import snacksFooter from "./assets/category-banners/snacks-footer.jpg"
import readytoeatHeader from "./assets/category-banners/readytoeat-header.jpg"
import readytoeatFooter from "./assets/category-banners/readytoeat-footer.jpg"

const categoryAssets = {
  "Produce": {
    headerImage: produceHeader,
    footerImage: produceFooter,
  },
  "Frozen Foods": {
    headerImage: frozenHeader,
    footerImage: frozenFooter,
  },
  "Desserts": {
    headerImage: dessertsHeader,
    footerImage: dessertsFooter,
  },
  "Seasonings": {
    headerImage: seasoningsHeader,
    footerImage: seasoningsFooter
  },
  "Snacks": {
    headerImage: snacksHeader,
    footerImage: snacksFooter
  },
  "Ready-to-eat": {
    headerImage: readytoeatHeader,
    footerImage: readytoeatFooter
  }
  // ...add more
};

export default categoryAssets;
