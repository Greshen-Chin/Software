import { IsString, IsNotEmpty, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  deadline: string;

  @IsNumber()
  @Min(1)
  @Max(3)
  priority: number;
}