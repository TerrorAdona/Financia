"use server";

import { revalidatePath } from "next/cache";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/category-schemas";
import { requireUserId } from "@/lib/auth-helpers";
import type { CategoriesResult, CategoryDTO } from "@/lib/services/categories";
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  updateCategory as updateCategoryService,
} from "@/lib/services/categories";

export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<CategoriesResult<CategoryDTO>> {
  const userId = await requireUserId();
  const result = await createCategoryService(userId, input);
  if (!result.error) revalidatePath("/categories");
  return result;
}

export async function updateCategoryAction(
  input: UpdateCategoryInput,
): Promise<CategoriesResult<CategoryDTO>> {
  const userId = await requireUserId();
  const result = await updateCategoryService(userId, input);
  if (!result.error) revalidatePath("/categories");
  return result;
}

export async function deleteCategoryAction(
  id: string,
): Promise<CategoriesResult> {
  const userId = await requireUserId();
  const result = await deleteCategoryService(userId, id);
  if (!result.error) revalidatePath("/categories");
  return result;
}
