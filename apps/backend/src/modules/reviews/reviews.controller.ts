import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetMyReviewsQueryDto } from './dto/get-my-reviews-query.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'ثبت review توسط مشتري براي سفارش تحويل شده' })
  create(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'دريافت reviewهاي ثبت شده توسط مشتري' })
  findMyReviews(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: GetMyReviewsQueryDto,
  ) {
    return this.reviewsService.findMyReviews(user, query);
  }
}
