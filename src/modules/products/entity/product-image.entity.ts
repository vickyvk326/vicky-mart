import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';
import { Exclude } from 'class-transformer';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column()
  url: string;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  product: Product;
}
