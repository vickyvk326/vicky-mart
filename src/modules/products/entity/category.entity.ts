import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SubCategory } from './subCategory.entity';
import { Exclude } from 'class-transformer';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  @Exclude()
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => SubCategory, (sub) => sub.category)
  subCategories: SubCategory[];
}
