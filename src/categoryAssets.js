// categoryAssets.js
import produceHeader from "./assets/category-banners/produce-header.jpg";
import produceFooter from "./assets/category-banners/produce-footer.jpg";
import frozenHeader from "./assets/category-banners/frozenfoods-header.jpg";
import frozenFooter from "./assets/category-banners/frozenfoods-footer.jpg";

const categoryAssets = {
  "Produce": {
    headerImage: produceHeader,
    footerImage: produceFooter,
  },
  "Frozen Foods": {
    headerImage: frozenHeader,
    footerImage: frozenFooter,
  },
  // ...add more
};

export default categoryAssets;
