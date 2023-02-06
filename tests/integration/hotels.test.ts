import app, { init } from '@/app';
import { prisma } from '@/config';
import faker from '@faker-js/faker';
import { TicketStatus } from '@prisma/client';
import httpStatus from 'http-status';
import * as jwt from 'jsonwebtoken';
import supertest from 'supertest';
import {
	createEnrollmentWithAddress,
	createUser,
	createTicketType,
	createTicket,
	createPayment,
	generateCreditCardData,
	createTicketTypeWithHotel,
	createTicketTypeRemote,
} from '../factories';
import { cleanDb, generateValidToken } from '../helpers';

beforeAll(async () => {
	await init();
});

beforeEach(async () => {
	await cleanDb();
});

const server = supertest(app);

describe('GET /hotels', () => {
	it('should respond with status 401 if no token is given', async () => {
		const response = await server.get('/hotels');
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	it('should respond with status 401 if given token is not valid', async () => {
		const token = faker.lorem.word();
		const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	it('should respond with status 401 if there is no session for given token', async () => {
		const userWithoutSession = await createUser();
		const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
		const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	describe('when token is valid', () => {
		it('should respond with status 200 and a list of hotels', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeWithHotel();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			const payment = await createPayment(ticket.id, ticketType.price);
			const hotel = await prisma.hotel.create({
				data:{
					name: 'Cheval Blanc St-Tropez',
					image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/27/a4/49/a4/cheval-blanc-st-tropez.jpg?w=700&h=-1&s=1'
				}
			});
			const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.OK);
			expect(response.body).toEqual([{
				id: hotel.id,
				name: hotel.name,
				image: hotel.image,
				createdAt: hotel.createdAt.toISOString(),
				updatedAt: hotel.updatedAt.toISOString()
			}]);
		});
		it('should respond with status 200 and an empty array', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeWithHotel();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			const payment = await createPayment(ticket.id, ticketType.price);
			const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.OK);
			expect(response.body).toEqual([]);
		});
		it('should respond with status 402 when ticket is remote, ticket is not paid or ticket is wihtout hotel', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeRemote();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			await createPayment(ticket.id, ticketType.price);
			const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
		});
		it('should respond with status 404 when user has no enrollment', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			await createTicketTypeRemote();
			const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.NOT_FOUND);
		});
	});
});
describe('GET /hotels/:hotelId', () => {
	it('should respond with status 401 if no token is given', async () => {
		const response = await server.get('/hotels/1');
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	it('should respond with status 401 if given token is not valid', async () => {
		const token = faker.lorem.word();
		const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	it('should respond with status 401 if there is no session for given token', async () => {
		const userWithoutSession = await createUser();
		const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
		const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
		expect(response.status).toBe(httpStatus.UNAUTHORIZED);
	});
	describe('when token is valid', () => {
		it('should respond with status 200 and a hotel with no rooms', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeWithHotel();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			const payment = await createPayment(ticket.id, ticketType.price);
			const hotel = await prisma.hotel.create({
				data:{
					name: 'Cheval Blanc St-Tropez',
					image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/27/a4/49/a4/cheval-blanc-st-tropez.jpg?w=700&h=-1&s=1'
				}
			});
			const room = await prisma.room.create({
				data: {
					name: '301',
					capacity: 4,
					hotelId: hotel.id
				}
			});
			const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.OK);
			expect(response.body).toEqual([{
				id: hotel.id,
				name: hotel.name,
				image: hotel.image,
				createdAt: hotel.createdAt.toISOString(),
				updatedAt: hotel.updatedAt.toISOString(),
				Rooms: [{
					id: room.id,
					name: room.name,
					capacity: room.capacity,
					hotelId: room.hotelId,
					createdAt: room.createdAt.toISOString(),
					updatedAt: room.updatedAt.toISOString()
				}]
			}]);
		});
		it('should respond with status 200 and a hotel with rooms', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeWithHotel();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			const payment = await createPayment(ticket.id, ticketType.price);
			const hotel = await prisma.hotel.create({
				data:{
					name: 'Cheval Blanc St-Tropez',
					image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/27/a4/49/a4/cheval-blanc-st-tropez.jpg?w=700&h=-1&s=1'
				}
			});

			const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.OK);
			expect(response.body).toEqual([{
				id: hotel.id,
				name: hotel.name,
				image: hotel.image,
				createdAt: hotel.createdAt.toISOString(),
				updatedAt: hotel.updatedAt.toISOString(),
				Rooms: []
			}]);
		});
		it('should respond with status 200 and an empty array', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeWithHotel();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			const payment = await createPayment(ticket.id, ticketType.price);
			const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.OK);
			expect(response.body).toEqual([]);
		});
		it('should respond with status 402 when ticket is remote, ticket is not paid or ticket is wihtout hotel', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			const enrollment = await createEnrollmentWithAddress(user);
			const ticketType = await createTicketTypeRemote();
			const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
			await createPayment(ticket.id, ticketType.price);
			const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
		});
		it('should respond with status 404 when user has no enrollment', async () => {
			const user = await createUser();
			const token = await generateValidToken(user);
			await createTicketTypeRemote();
			const response = await server.get('/hotels/1').set('Authorization', `Bearer ${token}`);
			expect(response.status).toEqual(httpStatus.NOT_FOUND);
		});
	});
});