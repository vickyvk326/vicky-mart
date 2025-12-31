import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SubCategory } from './subCategory.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SubCategory, (sub) => sub.category)
  subCategories: SubCategory[];
}
