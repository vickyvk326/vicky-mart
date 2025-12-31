import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductAttribute } from './product-attribute.entity';
import { ProductImage } from './product-image.entity';
import { SubCategory } from './subCategory.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  pid: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  brand: string;

  @Column('decimal', { precision: 10, scale: 2 })
  actualPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  sellingPrice: number;

  @Column({ nullable: true })
  discount: string;

  @Column('float', { default: 0 })
  averageRating: number;

  @Column({ default: false })
  outOfStock: boolean;

  @ManyToOne(() => SubCategory, (subCategory) => subCategory.products)
  subCategory: SubCategory;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductAttribute, (attr) => attr.product, { cascade: true })
  attributes: ProductAttribute[];
}
