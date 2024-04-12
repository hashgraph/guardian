import { AfterCreate, AfterDelete, AfterUpdate, BeforeCreate, Entity, OnLoad, Property } from '@mikro-orm/core';
import { ObjectId } from 'mongodb'
import { BaseEntity } from '../models/index.js';
import { DataBaseHelper } from '../helpers/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';

@Entity()
export class DryRunFiles extends BaseEntity{

    /**
     * Policy ID
     */
    @Property({nullable: false})
    policyId: string

    /**
     * File
     */
    @Property({nullable: true})
    file: Buffer;

    /**
     * File ID
     */
    @Property({nullable: true})
    fileId: ObjectId

    @BeforeCreate()
    async beforeCreate() {
        await new Promise<void>((resolve, reject) => {
            const file = this.file;
            try {
                if (this.file) {
                    const fileStream = DataBaseHelper.gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );

                    this.fileId = fileStream.id

                    fileStream.write(file);
                    delete this.file;
                    fileStream.end(() => resolve());
                } else {
                    resolve();
                }
            } catch (error) {
                reject(error)
            }
        })

    }

    @AfterCreate()
    @OnLoad()
    @AfterUpdate()
    async loadDocument() {
        if (this.fileId) {
            const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                this.fileId
            );
            const bufferArray = [];
            for await (const data of fileStream) {
                bufferArray.push(data);
            }
            this.file = Buffer.concat(bufferArray);
        }
    }

    @AfterDelete()
    deleteDocument() {
        if (this.fileId) {
            DataBaseHelper.gridFS
                .delete(this.fileId)
                .catch(console.error);
        }
    }
}
