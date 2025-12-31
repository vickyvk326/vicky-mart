import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';
import { Category } from './category.entity';

@Entity('sub_categories')
export class SubCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Category, (cat) => cat.subCategories)
  category: Category;

  @OneToMany(() => Product, (product) => product.subCategory)
  products: Product[];
}
