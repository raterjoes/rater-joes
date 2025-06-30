import { db } from '../firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

// Save a product for a user
export async function saveProduct(userId, productId) {
  const ref = doc(db, `users/${userId}/savedProducts/${productId}`);
  await setDoc(ref, { savedAt: new Date() });
}

// Unsave a product for a user
export async function unsaveProduct(userId, productId) {
  const ref = doc(db, `users/${userId}/savedProducts/${productId}`);
  await deleteDoc(ref);
}

// Get all saved product IDs for a user
export async function getSavedProductIds(userId) {
  const col = collection(db, `users/${userId}/savedProducts`);
  const snap = await getDocs(col);
  return snap.docs.map(doc => doc.id);
}

// Save a recipe for a user
export async function saveRecipe(userId, recipeId) {
  const ref = doc(db, `users/${userId}/savedRecipes/${recipeId}`);
  await setDoc(ref, { savedAt: new Date() });
}

// Unsave a recipe for a user
export async function unsaveRecipe(userId, recipeId) {
  const ref = doc(db, `users/${userId}/savedRecipes/${recipeId}`);
  await deleteDoc(ref);
}

// Get all saved recipe IDs for a user
export async function getSavedRecipeIds(userId) {
  const col = collection(db, `users/${userId}/savedRecipes`);
  const snap = await getDocs(col);
  return snap.docs.map(doc => doc.id);
} 