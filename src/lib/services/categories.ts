import type { TransactionType } from "@prisma/client";

import {
  DEFAULT_CATEGORIES,
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/category-schemas";
import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";

export type CategoryKind = Exclude<TransactionType, "TRANSFER">;

export type CategoryDTO = {
  id: string;
  name: string;
  type: CategoryKind;
  icon: string;
  color: string;
  transactionCount: number;
  budgetCount: number;
};

export type CategoriesResult<T = undefined> = {
  data?: T;
  error?: string;
};

function toDTO(category: {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  _count?: { transactions: number; budgets: number };
}): CategoryDTO {
  if (category.type === "TRANSFER") {
    throw new Error("Type de catégorie inattendu.");
  }
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon ?? "Tag",
    color: category.color ?? "#64748b",
    transactionCount: category._count?.transactions ?? 0,
    budgetCount: category._count?.budgets ?? 0,
  };
}

const countInclude = {
  _count: { select: { transactions: true, budgets: true } },
} as const;

/** Crée les 17 catégories par défaut pour un nouvel utilisateur. */
export async function seedDefaultCategories(userId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    skipDuplicates: true,
  });
}

/** Liste les catégories de l'utilisateur, revenus puis dépenses. */
export async function listCategories(
  userId: string,
): Promise<CategoriesResult<CategoryDTO[]>> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: countInclude,
  });
  return { data: categories.map(toDTO) };
}

/** Crée une catégorie (nom unique par utilisateur et par type). */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoriesResult<CategoryDTO>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, userId },
      include: countInclude,
    });
    return { data: toDTO(category) };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    ) {
      return { error: "Une catégorie porte déjà ce nom pour ce type." };
    }
    throw error;
  }
}

/** Modifie une catégorie appartenant à l'utilisateur. */
export async function updateCategory(
  userId: string,
  input: UpdateCategoryInput,
): Promise<CategoriesResult<CategoryDTO>> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.category.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return { error: "Catégorie introuvable." };

  try {
    const category = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        icon: parsed.data.icon,
        color: parsed.data.color,
      },
      include: countInclude,
    });
    return { data: toDTO(category) };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    ) {
      return { error: "Une catégorie porte déjà ce nom pour ce type." };
    }
    throw error;
  }
}

/**
 * Supprime une catégorie appartenant à l'utilisateur.
 * Refusée si des transactions ou des budgets l'utilisent (pas de
 * suppression brutale de l'historique : réaffectez d'abord les éléments).
 */
export async function deleteCategory(
  userId: string,
  id: string,
): Promise<CategoriesResult> {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
    include: countInclude,
  });
  if (!existing) return { error: "Catégorie introuvable." };

  const linkedTx = existing._count.transactions;
  const linkedBudgets = existing._count.budgets;
  if (linkedTx > 0 || linkedBudgets > 0) {
    const parts: string[] = [];
    if (linkedTx > 0)
      parts.push(`${linkedTx} transaction(s)`);
    if (linkedBudgets > 0) parts.push(`${linkedBudgets} budget(s)`);
    return {
      error: `Impossible de supprimer cette catégorie : ${parts.join(" et ")} l'utilisent encore.`,
    };
  }

  await prisma.category.delete({ where: { id: existing.id } });
  return { data: undefined };
}
