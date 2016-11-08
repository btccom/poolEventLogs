import db from './lib/db';

export default async function(socket: SocketIO.Socket, next: (err?: any) => void) {
    const { access_key, puid } = socket.handshake.query;

    if (!!access_key && !!puid) {
        const row = await db.raw(`select v1.uid
                                  from users v1 join subaccounts v2
                                    on v1.uid = v2.puid
                                  where v1.access_key = ? and v2.puid = ?
                                  limit 1`, [ access_key, puid ]);
        if (row) {
            return next();
        }
    }

    return next(new Error(`authentication error`));
}