export class CreateCategoryDto {
  name: string;
  slug: string;
  parentId?: number;
  description?: string;
}
