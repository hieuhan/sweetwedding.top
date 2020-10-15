class Messages {
    constructor(da) {
        this.dataAccess = da;
    }

    createTable() {
        const sql =  `CREATE TABLE IF NOT EXISTS Messages (
            MessageId	INTEGER NOT NULL,
            MessageTypeId	INTEGER NOT NULL,
            FullName	TEXT,
            MessageContent	TEXT,
            UserId	TEXT NOT NULL,
            ReviewStatusId	NUMERIC DEFAULT 0,
            CrDateTime	TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(MessageTypeId) REFERENCES MessageTypes(MessageTypeId),
            PRIMARY KEY(MessageId AUTOINCREMENT)
        )`;
        return this.dataAccess.run(sql)
    }

    create(messageTypeId, fullName, messageContent, userId, reviewStatusId) {
        return this.dataAccess.run(
            `INSERT INTO Messages (MessageTypeId, FullName, MessageContent, UserId, ReviewStatusId)
            VALUES (?, ?, ?, ?, ?)`,
            [messageTypeId, fullName, messageContent, userId, reviewStatusId])
    }

    update(project) {
        const { messageTypeId, userId } = project
        return this.dataAccess.run(
            `UPDATE Messages SET MessageTypeId = ? WHERE UserId = ?`,
            [messageTypeId, userId]
        )
    }

    delete(project) {
        const { messageTypeId, userId } = project
        return this.dataAccess.run(
            `DELETE FROM Messages WHERE UserId = ? AND MessageTypeId = ?`,
            [userId, messageTypeId]
        )
    }

    getById(project) {
        const { messageTypeId, userId } = project
        return this.dataAccess.get(
            `SELECT * FROM Messages WHERE UserId = ? AND MessageTypeId = ?`,
            [userId, messageTypeId]);
    }

    getCount() {
        return this.dataAccess.all(`SELECT COUNT(1) AS Total,MessageTypeId FROM Messages GROUP BY MessageTypeId`,);
    }

    getList(messageTypeId, rows) {
        return this.dataAccess.all(`SELECT * FROM Messages WHERE MessageTypeId = ? AND ReviewStatusId = 1 ORDER BY CrDateTime DESC LIMIT ?`, [messageTypeId, rows]);
    }
}

module.exports = Messages;