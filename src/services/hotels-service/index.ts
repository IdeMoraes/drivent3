import { notFoundError } from '@/errors';
import { cannotListHotelsError } from '@/errors/cannot-list-hotels-error';
import enrollmentRepository from '@/repositories/enrollment-repository';
import hotelRepository from '@/repositories/hotel-repository';
import ticketRepository from '@/repositories/ticket-repository';

async function getHotels(userId: number){
	const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
	if(!enrollment){
		throw notFoundError();
	}
	const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
	if(!ticket || ticket.status==='RESERVED' || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel){
		throw cannotListHotelsError();
	}
	const hotels = await hotelRepository.findHotels();
	return hotels;
}
async function getHotelsWithRooms(userId: number, hotelId: number){
	const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
	if(!enrollment){
		throw notFoundError();
	}
	const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);
	if(!ticket || ticket.status==='RESERVED' || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel){
		throw cannotListHotelsError();
	}
	const hotels = await hotelRepository.findRoomsByHotelId(hotelId);
	return hotels;
}

const hotelService = {
	getHotels,
	getHotelsWithRooms
};
  
export default hotelService;