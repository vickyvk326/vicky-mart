import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_attributes')
export class ProductAttribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string; // e.g., "Fabric"

  @Column()
  value: string; // e.g., "Cotton Blend"

  @ManyToOne(() => Product, (product) => product.attributes, { onDelete: 'CASCADE' })
  product: Product;
}
