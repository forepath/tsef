import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Agent entity representing an agent in the system.
 * Each agent has a unique UUID identifier, name, description, and hashed password.
 */
@Entity('agents')
export class AgentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 255, name: 'hashed_password' })
  hashedPassword!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'container_id' })
  containerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'volume_path' })
  volumePath?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
