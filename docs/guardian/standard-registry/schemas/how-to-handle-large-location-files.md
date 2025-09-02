# How to handle large location files?

1. Users can upload **.kml** or **.json** files to populate _geoJson_ fields with locations.

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FfiLDGIdHBK2c5jCDmTk8%252Fimage.png%3Falt%3Dmedia%26token%3D29378344-7b8d-42b7-b554-b6a3bfd4567b&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=b15263b7&#x26;sv=2" alt=""><figcaption></figcaption></figure>

2. The imported locations appear as grey shapes overlaid on the map.

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FRGXZLFzNp03Xm0h9HkUF%252Fimage.png%3Falt%3Dmedia%26token%3D42bc44c6-a546-4cc1-83f5-b70ccaf37948&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=ef38795a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

To select a location, click its shape on the map. The shape will be highlighted in green, and its textual definition will appear in the editable panel below the map. You can add, modify, or delete multiple locations. Clicking a selected location again will deselect it.

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FmUnM9o2DPgl6g5fnwzZI%252Fimage.png%3Falt%3Dmedia%26token%3D4362aaad-8b36-4308-a789-937bb61a6e05&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=f7353e0a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

3. You can also use the **“Include all”** option to import all locations from the uploaded file.

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FCFEGn95MW5tnM5fgZag4%252Fimage.png%3Falt%3Dmedia%26token%3D352a17fa-0770-4f4a-a22d-2bafebbd8fad&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=b6fd078a&#x26;sv=2" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:** Web browsers limit the size of items they can render. The exact threshold depends on the host computer’s hardware and operating system configuration. If an uploaded file exceeds these limits, Guardian UI displays a warning message.
{% endhint %}

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FuBAzZDX16RzeRoLXZfGW%252Fimage.png%3Falt%3Dmedia%26token%3D5fa3a5c5-758b-4825-9238-03782227f4d9&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=1c3c41b9&#x26;sv=2" alt=""><figcaption></figcaption></figure>

4. When these limits are reached, Guardian UI also provides an option to download the files by clicking the corresponding button in a modal window.

<figure><img src="https://docs.hedera.com/guardian-dev-1/~gitbook/image?url=https%3A%2F%2F501642358-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FbKnJV8vV7zUxRwKIsJKg%252Fuploads%252FKPQvWznYFw4jfuehkVs4%252Fimage.png%3Falt%3Dmedia%26token%3Dc01a7f2a-e397-491d-b1bf-64d7cf88a027&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=1a1eb375&#x26;sv=2" alt=""><figcaption></figcaption></figure>
